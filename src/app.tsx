/*
 * This file is part of Cockpit.
 *
 * Copyright (C) 2017 Red Hat, Inc.
 *
 * Cockpit is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation; either version 2.1 of the License, or
 * (at your option) any later version.
 *
 * Cockpit is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with Cockpit; If not, see <http://www.gnu.org/licenses/>.
 */

import React, { useEffect, useState } from 'react';
import { Button, Content, ContentVariants, Flex, FlexItem, Page, PageSection, PageSectionVariants, PageSidebar, Stack, ToggleGroup, ToggleGroupItem } from '@patternfly/react-core';

import { WithDialogs } from 'dialogs';
import cockpit from 'cockpit';
import { superuser } from 'superuser';
import { fsinfo } from 'cockpit/fsinfo';
import { EmptyStatePanel } from 'cockpit-components-empty-state';
import { ExclamationCircleIcon } from '@patternfly/react-icons';

import { GrubFile } from './grubfile';
import { AdvancedValues } from './pages/advanced';
import { KernelParameters } from './pages/kernel_params';

const _ = cockpit.gettext;

type Pages = "advanced" | "kernel-params";

const SelectedPage = ({ page, grub }: { page: Pages, grub: GrubFile }) => {
    switch (page) {
    case "advanced":
        return <AdvancedValues grub={grub} />;
    case "kernel-params":
        return <KernelParameters grub={grub} />;
    default:
        return null;
    }
};

const LoadingGrub = () => {
    return (
        <Stack>
            <EmptyStatePanel
                title={_("Loading Grub information")}
                icon={ExclamationCircleIcon}
                loading
            />
        </Stack>
    );
};

const GrubNotFound = () => {
    return (
        <Stack>
            <EmptyStatePanel
                title={ _("No grub bootloader found") }
                icon={ ExclamationCircleIcon }
                paragraph={
                    <Content component={ContentVariants.p}>
                        {_("Make sure you have grub installed and that /etc/default/grub exists")}
                    </Content>
                }
            />
        </Stack>
    );
};

const UpdatingGrub = () => {
    return (
        <Stack>
            <EmptyStatePanel
                title={_("Updating grub configuration")}
                icon={ExclamationCircleIcon}
                loading
            />
        </Stack>
    );
};

const AuthenticationError = () => {
    return (
        <Stack>
            <EmptyStatePanel
                title={ _("Authentication error") }
                icon={ ExclamationCircleIcon }
                paragraph={
                    <Content component={ContentVariants.p}>
                        {_("Administrative access is required.")}
                    </Content>
                }
            />
        </Stack>
    );
};

// Hack to hide the Sidebar area in patternfly 6 Page
const emptySidebar = <PageSidebar isSidebarOpen={false} />;

export const Application = () => {
    const [grub, setGrub] = useState<GrubFile | null>(null);
    const [page, setPage] = React.useState<Pages>("kernel-params");
    const [hasGrub, setHasGrub] = useState<boolean | undefined>(undefined);
    const [updatingGrub, setUpdatingGrub] = useState(false);
    const [authenticated, setAuthenticated] = React.useState(superuser.allowed);

    const updateGrub = React.useCallback(() => {
        if (grub) {
            setUpdatingGrub(true);
            cockpit.file('/etc/default/grub', { superuser: "require" })
                            .replace(grub.toFile()).then(() => {
                                cockpit.spawn(["grub2-mkconfig", "-o", "/boot/grub2/grub.cfg"], { superuser: "require" })
                                                .then(() => console.log("mkconfig success"))
                                                .catch((reason) => {
                                                    console.error(reason);
                                                })
                                                .finally(() => setUpdatingGrub(false));
                            })
                            .catch((reason) => {
                                console.error(reason);
                                setUpdatingGrub(false);
                            });
        }
    }, [grub]);

    const resetGrub = () => {
        // setting grub value to null first forces the state to reload
        setGrub(null);

        cockpit.file('/etc/default/grub')
                        .read()
                        .then(content => setGrub(new GrubFile(content ?? "")));
    };

    useEffect(() => {
        fsinfo('/etc/default/grub', [])
                        .then(() => setHasGrub(true))
                        .catch(() => setHasGrub(false));

        superuser.addEventListener("changed", () => { setAuthenticated(superuser.allowed) });

        const hostname = cockpit.file('/etc/default/grub');

        hostname.watch(content => setGrub(new GrubFile(content ?? "")));
        return hostname.close;
    }, []);

    if (!authenticated) {
        return <AuthenticationError />;
    }

    if (hasGrub === undefined) {
        return <LoadingGrub />;
    }

    if (hasGrub === false) {
        return <GrubNotFound />;
    }

    if (updatingGrub) {
        return <UpdatingGrub />;
    }

    return (
        <WithDialogs>
            <Page sidebar={emptySidebar} className='no-masthead-sidebar'>
                <PageSection variant={PageSectionVariants.default}>
                    <Flex>
                        <FlexItem align={{ default: 'alignLeft' }}>
                            <ToggleGroup>
                                <ToggleGroupItem
                                    isSelected={page === "kernel-params"}
                                    buttonId="KernelParams"
                                    text={_("Kernel Parameters")}
                                    onChange={() => setPage("kernel-params")}
                                />
                                <ToggleGroupItem
                                    isSelected={page === "advanced"}
                                    buttonId="Advanced"
                                    text={_("Advanced")}
                                    onChange={() => setPage("advanced")}
                                />
                            </ToggleGroup>
                        </FlexItem>
                        <FlexItem align={{ default: 'alignRight' }}>
                            <Button variant="primary" onClick={() => updateGrub()}>
                                {_("Save")}
                            </Button>
                            <Button variant="secondary" onClick={() => resetGrub()}>
                                {_("Reset")}
                            </Button>
                        </FlexItem>
                    </Flex>
                </PageSection>
                {grub ? <SelectedPage page={page} grub={grub} /> : null}
            </Page>
        </WithDialogs>
    );
};
